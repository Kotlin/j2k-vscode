package org.springframework.samples.petclinic.owner

import java.time.LocalDate
import org.springframework.stereotype.Controller
import org.springframework.ui.ModelMap
import org.springframework.web.bind.annotation.*
import jakarta.validation.Valid
import org.springframework.web.servlet.mvc.support.RedirectAttributes
import org.springframework.util.StringUtils

/**
 * @author Juergen Hoeller
 * @author Ken Krebs
 * @author Arjen Poutsma
 * @author Wick Dynex
 */
@Controller
@RequestMapping("/owners/{ownerId}")
class PetController(
    private val owners: OwnerRepository,
    private val types: PetTypeRepository
) {

    private const val VIEWS_PETS_CREATE_OR_UPDATE_FORM = "pets/createOrUpdatePetForm"

    @ModelAttribute("types")
    fun populatePetTypes(): Collection<PetType> {
        return this.types.findAll()
    }

    @ModelAttribute("owner")
    fun findOwner(@PathVariable("ownerId") ownerId: Int): Owner {
        val optionalOwner = owners.findById(ownerId)
            ?: throw IllegalArgumentException("Owner not found with id: $ownerId. Please ensure the ID is correct ")
        return optionalOwner
    }

    @ModelAttribute("pet")
    fun findPet(
        @PathVariable("ownerId") ownerId: Int,
        @PathVariable(name = "petId", required = false) petId: Int?
    ): Pet {
        if (petId == null) {
            return Pet()
        }
        val optionalOwner = owners.findById(ownerId)
            ?: throw IllegalArgumentException("Owner not found with id: $ownerId. Please ensure the ID is correct ")
        return optionalOwner.getPet(petId)
    }

    @InitBinder("owner")
    fun initOwnerBinder(dataBinder: WebDataBinder) {
        dataBinder.setDisallowedFields("id")
    }

    @InitBinder("pet")
    fun initPetBinder(dataBinder: WebDataBinder) {
        dataBinder.setValidator(PetValidator())
    }

    @GetMapping("/pets/new")
    fun initCreationForm(@ModelAttribute("owner") owner: Owner): String {
        val pet = Pet()
        owner.addPet(pet)
        return VIEWS_PETS_CREATE_OR_UPDATE_FORM
    }

    @PostMapping("/pets/new")
    fun processCreationForm(
        @ModelAttribute("owner") owner: Owner,
        @Valid pet: Pet,
        result: BindingResult,
        redirectAttributes: RedirectAttributes
    ): String {
        if (pet.name != null && !pet.name.isNullOrEmpty() && pet.isNew()) {
            val existingPet = owner.getPet(pet.name, true)
            if (existingPet != null) {
                result.addError(result.getField("name"))
                result.rejectValue(
                    "name",
                    "duplicate",
                    "already exists"
                )
            }
        }

        if (pet.birthDate != null && pet.birthDate.isAfter(LocalDate.now())) {
            result.addFieldValueError("birthDate", "typeMismatch")
        }

        if (result.hasErrors()) {
            return VIEWS_PETS_CREATE_OR_UPDATE_FORM
        }

        owner.addPet(pet)
        owners.save(owner)

        redirectAttributes.addFlashAttribute("message", "New Pet has been Added")
        return "redirect:/owners/${owner.id}"
    }

    @GetMapping("/pets/{petId}/edit")
    fun initUpdateForm(): String {
        return VIEWS_PETS_CREATE_OR_UPDATE_FORM
    }

    @PostMapping("/pets/{petId}/edit")
    fun processUpdateForm(
        @ModelAttribute("owner") owner: Owner,
        @Valid pet: Pet,
        result: BindingResult,
        redirectAttributes: RedirectAttributes
    ): String {
        val petName = pet.name

        if (!petName.isNullOrEmpty()) {
            val existingPet = owner.getPet(petName, false)
            if (existingPet != null && !existingPet.id.equals(pet.id)) {
                result.addFieldValueError("name", "duplicate")
            }
        }

        if (pet.birthDate != null && pet.birthDate.isAfter(LocalDate.now())) {
            result.addFieldValueError("birthDate", "typeMismatch")
        }

        if (result.hasErrors()) {
            return VIEWS_PETS_CREATE_OR_UPDATE_FORM
        }

        updatePetDetails(owner, pet)
        redirectAttributes.addFlashAttribute("message", "Pet details has been edited")

        owners.save(owner)
        return "redirect:/owners/${owner.id}"
    }

    private fun updatePetDetails(owner: Owner, pet: Pet) {
        val existingPet = owner.getPet(pet.id)

        if (existingPet != null) {
            // Update existing pet's properties
            existingPet.name = pet.name
            existingPet.birthDate = pet.birthDate
            existingPet.type = pet.type
        } else {
            owner.addPet(pet)
        }
    }

}