package org.springframework.samples.petclinic.owner;

import org.springframework.core.style.ToStringCreator;
import org.springframework.samples.petclinic.model.Person;
import org.springframework.util.Assert;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.NotBlank;

@Entity
@Table(name = "owners")
open class Owner(
    @Column(name = "address")
    @get:NotBlank
    var address: String,

    @Column(name = "city")
    @get:NotBlank
    var city: String,

    @Column(name = "telephone")
    @get:NotBlank
    @get:Pattern(regexp = "\\d{10}", message = "{telephone.invalid}")
    var telephone: String,

    @OneToMany(cascade = [CascadeType.ALL], fetch = FetchType.EAGER)
    @JoinColumn(name = "owner_id")
    @get:OrderBy("name")
    val pets: MutableList<Pet> = ArrayList()
) : Person() {
    
    constructor() : this("", "", "", ArrayList())

    fun addPet(pet: Pet) {
        if (pet.isNew()) {
            pets.add(pet)
        }
    }

    fun getPet(name: String): Pet? {
        for (pet in pets) {
            val compName = pet.getName()
            if (compName != null && compName.equals(name, ignoreCase = true)) {
                return pet
            }
        }
        return null
    }

    fun getPet(id: Int): Pet? {
        for (pet in pets) {
            val compId = pet.getId()
            if (compId != null && compId == id) {
                return pet
            }
        }
        return null
    }

    fun getPet(name: String, ignoreNew: Boolean): Pet? {
        for (pet in pets) {
            val compName = pet.getName()
            if (compName != null && compName.equals(name, ignoreCase = true)) {
                if (!ignoreNew || !pet.isNew()) {
                    return pet
                }
            }
        }
        return null
    }

    override fun toString(): String {
        return ToStringCreator(this).append("id", this.getId()).append("new", this.isNew()).append("lastName", this.getLastName()).append("firstName", this.getFirstName()).append("address", this.address).append("city", this.city).append("telephone", this.telephone).toString()
    }

    fun addVisit(petId: Int, visit: Visit) {
        Assert.notNull(petId, "Pet identifier must not be null!")
        Assert.notNull(visit, "Visit must not be null!")
        val pet = getPet(petId)!!
        Assert.notNull(pet, "Invalid Pet identifier!")
        pet.addVisit(visit)
    }
}

