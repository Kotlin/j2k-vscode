package org.springframework.samples.petclinic.owner

import java.util.ArrayList
import java.util.List
import org.springframework.core.style.ToStringCreator
import org.springframework.samples.petclinic.model.Person
import org.springframework.util.Assert
import jakarta.persistence.CascadeType
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.OneToMany
import jakarta.persistence.OneToOne
import jakarta.persistence.OrderBy
import jakarta.persistence.Table
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Pattern

@Entity
@Table(name = "owners")
open class Owner : Person() {

    @field:NotBlank
    @Column(name = "address")
)
private var address: String? = null

    @field:NotBlank
    @Column(name = "city")
)
private var city: String? = null

    @field:NotBlank
    @Pattern(regexp = "\\d{10}", message = "{telephone.invalid}")
    @Column(name = "telephone")
)
private var telephone: String? = null

    // Convert pets to a mutable list with proper initialization
    @OneToMany(cascade = CascadeType.ALL, fetch = FetchType.EAGER)
    @JoinColumn(name = "owner_id")
    @field:OrderBy("name")
    private val pets: MutableList<Pet> = ArrayList()

    // Getters and setters for address, city, telephone
    fun getAddress(): String? {
        return this.address
    }

    fun setAddress(address: String?) {
        this.address = address
    }

    fun getCity(): String? {
        return this.city
    }

    fun setCity(city: String?) {
        this.city = city
    }

    fun getTelephone(): String? {
        return this.telephone
    }

    fun setTelephone(telephone: String?) {
        this.telephone = telephone
    }

    // Getters and setters for pets
    @get:OneToMany(cascade = CascadeType.ALL, fetch = FetchType.EAGER)
    @field:JoinColumn(name = "owner_id")
    @field:OrderBy("name")
    val pets: List<Pet>
        get() = this.pets

    fun addPet(pet: Pet) {
        if (pet.isNew()) {
            pets.add(pet)
        }
    }

    // Other methods remain unchanged
}